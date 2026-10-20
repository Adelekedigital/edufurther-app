import { HOME_ME_TIMEOUT_MS, fetchHome, homeFor } from './home';

type Me = Parameters<typeof homeFor>[0];
const mentorProfile = {} as NonNullable<NonNullable<Me>['mentor_profile']>;

describe('homeFor: where / sends each viewer (product 2026-10-15; every non-mentor member → /home)', () => {
  it.each([
    ['signed out', null, '/explore'],
    [
      'a signed-in member — goal or not (homeFor no longer checks)',
      { is_admin: false, mentor_profile: null },
      '/home',
    ],
    ['a mentor, any state', { is_admin: false, mentor_profile: mentorProfile }, '/dashboard'],
    ['a platform admin', { is_admin: true, mentor_profile: null }, '/admin'],
    ['an admin who is also a mentor', { is_admin: true, mentor_profile: mentorProfile }, '/admin'],
  ] as const)('%s → %s', (_who, me, home) => {
    expect(homeFor(me as Me)).toBe(home);
  });
});

describe('homeFor: a mentor sign-up remembered on the account', () => {
  it('with mentor onboarding on, / opens mentor onboarding, not the mentee’s', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', 'true');
    const { homeFor: home } = await import('./home');
    expect(home({ is_admin: false, mentor_profile: null, primary_role: 'mentor' } as Me)).toBe(
      '/onboarding/mentor',
    );
    // Only without a mentor profile: an applicant follows their application.
    expect(
      home({
        is_admin: false,
        primary_role: 'mentor',
        mentor_profile: { approval_status: 'pending', submitted_at: '2026-10-20T10:00:00Z' },
      } as Me),
    ).toBe('/mentor-application');
    vi.unstubAllEnvs();
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
    expect(await fetchHome({ accessToken: null })).toBe('/home');
    expect(await fetchHome({ accessToken: null, mockViewer: 'mentor' })).toBe('/dashboard');
    expect(await fetchHome({ accessToken: null, mockViewer: 'admin' })).toBe('/admin');
    expect(await fetchHome({ accessToken: null, mockViewer: 'constructor' })).toBe('/home');
  });
});

describe('homeFor: a declined applicant who chose mentee (owner, 2026-10-18)', () => {
  const profile = (approval_status: string) =>
    ({ approval_status }) as NonNullable<NonNullable<Me>['mentor_profile']>;
  it('is mentee-side; any other mentor stays on the dashboard', () => {
    expect(
      homeFor({ is_admin: false, mentor_profile: profile('declined'), primary_role: 'mentee' }),
    ).toBe('/home');
    expect(
      homeFor({ is_admin: false, mentor_profile: profile('declined'), primary_role: 'mentor' }),
    ).toBe('/dashboard');
    expect(
      homeFor({ is_admin: false, mentor_profile: profile('pending'), primary_role: 'mentee' }),
    ).toBe('/dashboard');
  });
});

describe('homeFor: the setup detours, one rule with sign-in (memberHome)', () => {
  async function load(onboarding: boolean, mentorOnboarding: boolean) {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', onboarding ? 'true' : '');
    vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', mentorOnboarding ? 'true' : '');
    return (await import('./home')).homeFor;
  }
  afterEach(() => vi.unstubAllEnvs());
  const unfinished = {
    is_admin: false,
    mentor_profile: null,
    onboarding: { complete: false, missing: [] },
  };
  const mentorAt = (p: object) => ({ is_admin: false, mentor_profile: p }) as Me;

  it('with the flags on: unfinished mentee → onboarding; a mentor not approved, or approved and unseen → the application', async () => {
    const home = await load(true, true);
    expect(home(unfinished as Me)).toBe('/onboarding');
    expect(home(mentorAt({ approval_status: 'pending', submitted_at: '2026-10-01' }))).toBe(
      '/mentor-application',
    );
    expect(home(mentorAt({ approval_status: 'declined' }))).toBe('/mentor-application');
    // Never submitted: straight to mentor onboarding (owner, 2026-10-18).
    expect(home(mentorAt({ approval_status: 'pending', submitted_at: null }))).toBe(
      '/onboarding/mentor',
    );
    expect(home(mentorAt({ approval_status: 'approved', approved_seen_at: null }))).toBe(
      '/mentor-application',
    );
    expect(home(mentorAt({ approval_status: 'approved', approved_seen_at: '2026-10-02' }))).toBe(
      '/dashboard',
    );
    // Declined and chose mentee: the mentee home.
    expect(
      home({ ...mentorAt({ approval_status: 'declined' }), primary_role: 'mentee' } as Me),
    ).toBe('/home');
  });

  it('with the flags off: nobody is sent to a page that 404s', async () => {
    const home = await load(false, false);
    expect(home(unfinished as Me)).toBe('/home');
    expect(home(mentorAt({ approval_status: 'declined' }))).toBe('/dashboard');
    expect(home(mentorAt({ approval_status: 'pending', submitted_at: null }))).toBe('/dashboard');
    expect(home(mentorAt({ approval_status: 'approved', approved_seen_at: null }))).toBe(
      '/dashboard',
    );
  });
});
