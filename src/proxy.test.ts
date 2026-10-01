import { NextRequest } from 'next/server';

const getClaims = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _u: string,
    _k: string,
    o: { cookies: { setAll: (l: { name: string; value: string; options: object }[]) => void } },
  ) => ({
    auth: {
      getClaims: async () => {
        // An expired token: the SDK refreshes it and writes new cookies.
        o.cookies.setAll([{ name: 'sb-x-auth-token', value: 'fresh', options: { path: '/' } }]);
        return getClaims();
      },
      getSession: async () => ({ data: { session: { access_token: 'tok-fresh' } } }),
    },
  }),
}));
vi.mock('@/lib/vendor/supabase/config', () => ({
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'k',
  authConfigured: true,
}));

const { proxy } = await import('./proxy');

// What the page render will see for a request header (Next's override protocol).
const forwarded = (res: Response, name: string) => res.headers.get(`x-middleware-request-${name}`);

describe('proxy: the session hint for the render', () => {
  it('a verified session: its user id, plus the refreshed cookie for render and browser', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    const res = await proxy(new NextRequest('https://app.test/explore'));
    expect(forwarded(res, 'x-ef-session')).toBe('u1');
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('fresh');
  });

  it('no session: "none", and a value a client sent is replaced, never passed on', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await proxy(
      new NextRequest('https://app.test/explore', { headers: { 'x-ef-session': 'someone-else' } }),
    );
    expect(forwarded(res, 'x-ef-session')).toBe('none');
  });

  it('a failed check (e.g. the refresh didn’t reach Supabase): no hint at all, so a signed-in visitor isn’t drawn as a guest', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('fetch failed') });
    const res = await proxy(
      new NextRequest('https://app.test/explore', { headers: { 'x-ef-session': 'someone-else' } }),
    );
    expect(forwarded(res, 'x-ef-session')).toBeNull();
    // The client's value is dropped too, not passed through.
    expect(res.headers.get('x-middleware-override-headers')).not.toContain('x-ef-session');
  });

  it('/ gets the verified (refreshed) token for its server call; other pages never do', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    const home = await proxy(new NextRequest('https://app.test/'));
    expect(forwarded(home, 'x-ef-access-token')).toBe('tok-fresh');
    const explore = await proxy(new NextRequest('https://app.test/explore'));
    expect(forwarded(explore, 'x-ef-access-token')).toBeNull();
  });

  it('a token header a client sent is removed, never passed on', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await proxy(
      new NextRequest('https://app.test/', { headers: { 'x-ef-access-token': 'someone-elses' } }),
    );
    expect(forwarded(res, 'x-ef-access-token')).toBeNull();
    expect(res.headers.get('x-middleware-override-headers')).not.toContain('x-ef-access-token');
  });
});
