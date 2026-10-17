import { NextRequest } from 'next/server';

const exchange = vi.fn();
vi.mock('@/lib/vendor/supabase/server', () => ({
  exchangeCodeForSession: (c: string) => exchange(c),
}));

const { GET } = await import('./route');

async function call(qs: string) {
  const res = await GET(new NextRequest(`https://app.test/auth/callback?${qs}`));
  const loc = new URL(res.headers.get('location')!);
  return loc.pathname + loc.search;
}

describe('/auth/callback', () => {
  beforeEach(() => exchange.mockReset());

  it('brings a Google sign-in back to its screen, with role and next', async () => {
    exchange.mockResolvedValueOnce(true);
    expect(await call('code=c&from=google&mode=signup&role=mentor&next=%2Fmentors%2Fgbenga')).toBe(
      '/signup?role=mentor&next=%2Fmentors%2Fgbenga&auth=google',
    );
    exchange.mockResolvedValueOnce(true);
    expect(await call('code=c&from=google')).toBe('/login?auth=google');
  });

  it('sends a refused Google sign-in back with its reason', async () => {
    expect(await call('from=google&error=access_denied&mode=signup')).toBe(
      '/signup?error=google_cancelled',
    );
    exchange.mockResolvedValueOnce(false);
    expect(await call('code=c&from=google')).toBe('/login?error=google_failed');
  });

  it('sends a working magic link straight on, and never off-site', async () => {
    exchange.mockResolvedValueOnce(true);
    expect(await call('code=c&next=%2Fhome')).toBe('/home');
    exchange.mockResolvedValueOnce(true);
    expect(await call('code=c')).toBe('/');
    exchange.mockResolvedValueOnce(true);
    expect(await call('code=c&from=google&next=%2F%2Fevil.com')).toBe(
      '/login?next=%2Fexplore&auth=google',
    );
  });
});
