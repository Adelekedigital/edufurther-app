// @vitest-environment node
import { PROXY_SECRET_HEADER, backendOrigin, proxySecret, proxySecretHeaders } from './backend';

const SECRET = 'a'.repeat(64);

afterEach(() => vi.unstubAllEnvs());

describe('backendOrigin', () => {
  it('the origin of BACKEND_URL, whatever path it was given with', () => {
    vi.stubEnv('BACKEND_URL', ' https://be.test/some/path ');
    expect(backendOrigin()).toBe('https://be.test');
  });

  it('unset outside Vercel: null (local dev on the mock); on Vercel: the build fails', () => {
    vi.stubEnv('BACKEND_URL', '');
    vi.stubEnv('VERCEL', '');
    expect(backendOrigin()).toBeNull();
    vi.stubEnv('VERCEL', '1');
    expect(() => backendOrigin()).toThrow(/BACKEND_URL is not set/);
  });

  it('plain http only to localhost; anything unparseable fails', () => {
    vi.stubEnv('BACKEND_URL', 'http://localhost:8000');
    expect(backendOrigin()).toBe('http://localhost:8000');
    vi.stubEnv('BACKEND_URL', 'http://be.test');
    expect(() => backendOrigin()).toThrow(/https/);
    vi.stubEnv('BACKEND_URL', 'not a url');
    expect(() => backendOrigin()).toThrow(/not a URL/);
  });
});

describe('proxySecret', () => {
  it('unset: null, and no header at all (the backend is unlocked unless its own is set)', () => {
    vi.stubEnv('EDGE_PROXY_SECRET', '');
    expect(proxySecret()).toBeNull();
    expect(proxySecretHeaders()).toEqual({});
  });

  it('set: the header carries it exactly, surrounding whitespace dropped', () => {
    vi.stubEnv('EDGE_PROXY_SECRET', `${SECRET}\n`);
    expect(proxySecretHeaders()).toEqual({ [PROXY_SECRET_HEADER]: SECRET });
    expect(PROXY_SECRET_HEADER).toBe('x-edufurther-proxy-secret');
  });

  it('a value the backend would refuse fails, without echoing it', () => {
    for (const bad of [
      'short-but-visible',
      `${'a'.repeat(20)} ${'b'.repeat(20)}`,
      `${'é'.repeat(40)}`,
    ]) {
      vi.stubEnv('EDGE_PROXY_SECRET', bad);
      expect(() => proxySecret(), bad).toThrow(/at least 32 visible ASCII/);
      try {
        proxySecret();
      } catch (e) {
        expect((e as Error).message).not.toContain(bad);
      }
    }
  });
});
