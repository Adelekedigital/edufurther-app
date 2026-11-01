import { resetLandingHint, saveLandingHint } from './landingHint';

const f = vi.fn(async () => new Response(null, { status: 204 }));
beforeEach(() => {
  resetLandingHint();
  f.mockClear();
  vi.stubGlobal('fetch', f);
});
afterEach(() => vi.unstubAllGlobals());

describe('saveLandingHint', () => {
  it('a home: one PUT with it, however many times it is asked on a page load', () => {
    saveLandingHint('sub-1', '/dashboard');
    saveLandingHint('sub-1', '/dashboard');
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/landing-hint');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ home: '/dashboard' });
  });

  it('null: a DELETE; another user or another home: sent again', () => {
    saveLandingHint('sub-1', null);
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('DELETE');
    saveLandingHint('sub-2', null);
    saveLandingHint('sub-2', '/dashboard');
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('a failed send is tried again next time', async () => {
    f.mockRejectedValueOnce(new TypeError('offline'));
    saveLandingHint('sub-1', '/dashboard');
    await Promise.resolve();
    await Promise.resolve();
    saveLandingHint('sub-1', '/dashboard');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
