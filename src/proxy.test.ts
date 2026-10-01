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
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } } });
    const res = await proxy(new NextRequest('https://app.test/explore'));
    expect(forwarded(res, 'x-ef-session')).toBe('u1');
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('fresh');
  });

  it('no session: "none", and a value a client sent is replaced, never passed on', async () => {
    getClaims.mockResolvedValue({ data: null });
    const res = await proxy(
      new NextRequest('https://app.test/explore', { headers: { 'x-ef-session': 'someone-else' } }),
    );
    expect(forwarded(res, 'x-ef-session')).toBe('none');
  });
});
