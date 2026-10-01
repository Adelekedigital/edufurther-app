import { fetchHome, homeFor } from './home';

const token = vi.fn<() => Promise<string | null>>();
vi.mock('@/lib/vendor/supabase/server', () => ({ serverAccessToken: () => token() }));

type Me = Parameters<typeof homeFor>[0];
const mentorProfile = {} as NonNullable<NonNullable<Me>['mentor_profile']>;

describe('homeFor: where / sends each viewer (product, 2026-09-30)', () => {
  it.each([
    ['signed out', null, '/explore'],
    ['a mentee', { is_admin: false, mentor_profile: null }, '/explore'],
    ['a mentor, any state', { is_admin: false, mentor_profile: mentorProfile }, '/dashboard'],
    ['a platform admin', { is_admin: true, mentor_profile: null }, '/admin'],
    ['an admin who is also a mentor', { is_admin: true, mentor_profile: mentorProfile }, '/admin'],
  ] as const)('%s → %s', (_who, me, home) => {
    expect(homeFor(me as Me)).toBe(home);
  });
});

describe('fetchHome', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    token.mockReset();
  });

  it('verified signed out: Explore without asking the backend', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await fetchHome({ signedIn: false })).toBe('/explore');
    expect(f).not.toHaveBeenCalled();
  });

  it('signed in: asks /me with the user’s own token, uncached', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
    vi.stubEnv('BACKEND_URL', 'https://api.test');
    token.mockResolvedValue('tok');
    const f = vi.fn(
      async (_req: Request) =>
        new Response(JSON.stringify({ is_admin: false, mentor_profile: { id: 'm' } }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', f);
    expect(await fetchHome({ signedIn: true })).toBe('/dashboard');
    const req = f.mock.calls[0]![0];
    expect(req.url).toBe('https://api.test/api/v1/me');
    expect(req.headers.get('authorization')).toBe('Bearer tok');
    expect(req.cache).toBe('no-store');
  });

  it('a failed /me (401, network) or no token: Explore, which shows the account notices', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
    vi.stubEnv('BACKEND_URL', 'https://api.test');
    token.mockResolvedValue('tok');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    expect(await fetchHome({ signedIn: true })).toBe('/explore');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('fetch failed'))),
    );
    expect(await fetchHome({ signedIn: true })).toBe('/explore');
    token.mockResolvedValue(null);
    expect(await fetchHome({ signedIn: true })).toBe('/explore');
  });

  it('mock mode: the env viewer, or ?mockViewer (own keys only)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
    expect(await fetchHome({ signedIn: false })).toBe('/explore');
    expect(await fetchHome({ signedIn: false, mockViewer: 'mentor' })).toBe('/dashboard');
    expect(await fetchHome({ signedIn: false, mockViewer: 'admin' })).toBe('/admin');
    expect(await fetchHome({ signedIn: false, mockViewer: 'constructor' })).toBe('/explore');
  });
});
