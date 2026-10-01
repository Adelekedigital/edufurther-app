import { HOME_ME_TIMEOUT_MS, fetchHome, homeFor } from './home';

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

const json = (body: object) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

describe('fetchHome', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
    vi.stubEnv('BACKEND_URL', 'https://api.test');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('no token (signed out, or the proxy couldn’t verify): Explore without asking the backend', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await fetchHome({ accessToken: null })).toBe('/explore');
    expect(f).not.toHaveBeenCalled();
  });

  it('a token: asks /me with it, uncached, and goes where the answer says', async () => {
    const f = vi.fn(async (_req: Request) =>
      json({ is_admin: false, mentor_profile: { id: 'm' } }),
    );
    vi.stubGlobal('fetch', f);
    expect(await fetchHome({ accessToken: 'tok' })).toBe('/dashboard');
    const req = f.mock.calls[0]![0];
    expect(req.url).toBe('https://api.test/api/v1/me');
    expect(req.headers.get('authorization')).toBe('Bearer tok');
    expect(req.cache).toBe('no-store');
  });

  it('a failed /me (401, network): Explore, which shows the account notices', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    expect(await fetchHome({ accessToken: 'tok' })).toBe('/explore');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('fetch failed'))),
    );
    expect(await fetchHome({ accessToken: 'tok' })).toBe('/explore');
  });

  it(`a /me slower than ${HOME_ME_TIMEOUT_MS} ms: stops waiting and goes to Explore`, async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (req: Request) =>
          new Promise<Response>((_resolve, reject) =>
            req.signal.addEventListener('abort', () => reject(req.signal.reason)),
          ),
      ),
    );
    const home = fetchHome({ accessToken: 'tok' });
    await vi.advanceTimersByTimeAsync(HOME_ME_TIMEOUT_MS + 1);
    expect(await home).toBe('/explore');
  });

  it('mock mode: the env viewer, or ?mockViewer (own keys only)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
    expect(await fetchHome({ accessToken: null })).toBe('/explore');
    expect(await fetchHome({ accessToken: null, mockViewer: 'mentor' })).toBe('/dashboard');
    expect(await fetchHome({ accessToken: null, mockViewer: 'admin' })).toBe('/admin');
    expect(await fetchHome({ accessToken: null, mockViewer: 'constructor' })).toBe('/explore');
  });
});
