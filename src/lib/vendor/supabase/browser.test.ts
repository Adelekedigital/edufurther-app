export {};

const signOutCall = vi.fn();
const oauthCall = vi.fn();
const stopAutoRefresh = vi.fn(async () => {});
const verifyCall = vi.fn();
const getUserCall = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      signOut: (o: unknown) => signOutCall(o),
      stopAutoRefresh: () => stopAutoRefresh(),
      signInWithOAuth: (o: unknown) => oauthCall(o),
      verifyOtp: (o: unknown) => verifyCall(o),
      getUser: () => getUserCall(),
    },
  }),
}));
vi.mock('./config', () => ({
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'k',
  authConfigured: true,
  COOKIE_OPTIONS: { secure: false },
}));

const {
  endSessionHere,
  signOut,
  signInWithGoogle,
  SIGN_OUT_TIMEOUT_MS,
  verifyEmailCode,
  signedInUser,
} = await import('./browser');

const setCookies = () => {
  document.cookie = 'sb-proj-auth-token.0=a; path=/';
  document.cookie = 'sb-proj-auth-token.1=b; path=/';
  document.cookie = 'theme=dark; path=/';
};

describe('signOut (Logout ends this device’s session)', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.cookie.split(';').forEach((c) => {
      const n = c.split('=')[0]!.trim();
      if (n) document.cookie = `${n}=; Max-Age=0; path=/`;
    });
  });

  it('the SDK signs out locally; its own cookie handling is left alone', async () => {
    setCookies();
    signOutCall.mockResolvedValue({ error: null });
    await signOut();
    expect(signOutCall).toHaveBeenCalledWith({ scope: 'local' });
    expect(document.cookie).toContain('sb-proj-auth-token.0=a');
  });

  it('Supabase unreachable (the SDK keeps the session): the auth cookies are cleared anyway, others kept', async () => {
    setCookies();
    signOutCall.mockResolvedValue({ error: new Error('Failed to fetch') });
    await signOut();
    expect(document.cookie).not.toContain('sb-proj-auth-token');
    expect(document.cookie).toContain('theme=dark');
  });

  it('the SDK throws: the same', async () => {
    setCookies();
    signOutCall.mockRejectedValue(new TypeError('network'));
    await signOut();
    expect(document.cookie).not.toContain('sb-proj-auth-token');
  });

  it('Supabase never answers: after the time limit the auth cookies are cleared and Logout goes on', async () => {
    vi.useFakeTimers();
    setCookies();
    signOutCall.mockReturnValue(new Promise(() => {}));
    const done = signOut();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS + 1);
    await done;
    expect(document.cookie).not.toContain('sb-proj-auth-token');
  });

  it('gave up, then a late refresh writes the cookie back: auto-refresh stops and the page clears it as it goes', async () => {
    vi.useFakeTimers();
    setCookies();
    signOutCall.mockReturnValue(new Promise(() => {}));
    const done = signOut();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS + 1);
    await done;
    expect(stopAutoRefresh).toHaveBeenCalled();
    // The SDK's refresh lands while /login is loading.
    document.cookie = 'sb-proj-auth-token=refreshed; path=/';
    window.dispatchEvent(new Event('pagehide'));
    expect(document.cookie).not.toContain('sb-proj-auth-token');
  });
});

describe('endSessionHere (sign out and stay on the sign-in screen)', () => {
  beforeEach(() => {
    signOutCall.mockReset();
    stopAutoRefresh.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.cookie.split(';').forEach((c) => {
      const n = c.split('=')[0]!.trim();
      if (n) document.cookie = `${n}=; Max-Age=0; path=/`;
    });
  });

  it('signs out locally and says so', async () => {
    signOutCall.mockResolvedValue({ error: null });
    expect(await endSessionHere()).toBe(true);
    expect(signOutCall).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('the SDK kept the session: false, and nothing is forced (cookies, refresh)', async () => {
    setCookies();
    signOutCall.mockResolvedValue({ error: new Error('Failed to fetch') });
    expect(await endSessionHere()).toBe(false);
    expect(document.cookie).toContain('sb-proj-auth-token.0=a');
    expect(stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('the SDK throws: false', async () => {
    signOutCall.mockRejectedValue(new TypeError('network'));
    expect(await endSessionHere()).toBe(false);
  });

  it('Supabase never answers: false after the time limit', async () => {
    vi.useFakeTimers();
    signOutCall.mockReturnValue(new Promise(() => {}));
    const done = endSessionHere();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS + 1);
    expect(await done).toBe(false);
  });
});

describe('signInWithGoogle', () => {
  const BACK = 'http://localhost:3000/auth/callback?next=%2Fexplore&from=google';

  it('asks Supabase for Google and carries the landing URL, so `next` survives', async () => {
    oauthCall.mockResolvedValue({ error: null });
    expect(await signInWithGoogle(BACK)).toEqual({ ok: true });
    expect(oauthCall).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: BACK },
    });
  });

  // The SDK builds the URL and navigates; it reports no error of its own, so
  // the only failure that can reach the caller is a throw before it leaves.
  // Unhandled, it would leave the button busy for ever.
  it('reports a failure to start instead of rejecting', async () => {
    oauthCall.mockRejectedValue(new Error('cookies are blocked'));
    expect(await signInWithGoogle(BACK)).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('verifyEmailCode (what a refused code means)', () => {
  it('calls a banned account banned, and an expired or wrong code invalid', async () => {
    verifyCall.mockResolvedValueOnce({ error: { status: 400, code: 'user_banned' } });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, reason: 'banned' });
    // Supabase answers wrong and expired alike; the screen's clock tells them apart.
    verifyCall.mockResolvedValueOnce({ error: { status: 403, code: 'otp_expired' } });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, reason: 'invalidCode' });
    verifyCall.mockResolvedValueOnce({ error: null });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: true });
  });
});

describe('signedInUser (Google names, and whether Google was just linked)', () => {
  const NOW = Date.parse('2026-10-17T12:00:00Z');
  const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

  it('reads the names Google sent', async () => {
    getUserCall.mockResolvedValueOnce({
      data: {
        user: {
          identities: [
            { provider: 'google', created_at: ago(0), identity_data: { given_name: ' Tolu ', family_name: 'Adebayo' } },
          ],
        },
      },
    });
    expect(await signedInUser(NOW)).toEqual({
      email: null,
      givenName: 'Tolu',
      familyName: 'Adebayo',
      fullName: null,
      googleJustLinked: false,
    });
  });

  it('reads the whole name from Supabase’s real Google shape (no given / family names)', async () => {
    const google = (identity_data: object) => ({
      data: { user: { identities: [{ provider: 'google', created_at: ago(0), identity_data }] } },
    });
    getUserCall.mockResolvedValueOnce(
      google({ full_name: 'Tolu Adebayo', name: 'Tolu Adebayo', email: 't@example.com' }),
    );
    expect(await signedInUser(NOW)).toMatchObject({
      givenName: null,
      familyName: null,
      fullName: 'Tolu Adebayo',
    });
    getUserCall.mockResolvedValueOnce(google({ name: ' Tolu Adebayo ' }));
    expect((await signedInUser(NOW))?.fullName).toBe('Tolu Adebayo');
  });

  it('calls Google just linked only when it joined another way in a moment ago', async () => {
    const user = (googleAt: string) => ({
      data: {
        user: {
          identities: [
            { provider: 'email', created_at: ago(500) },
            { provider: 'google', created_at: googleAt, identity_data: { given_name: 'Amara' } },
          ],
        },
      },
    });
    getUserCall.mockResolvedValueOnce(user(ago(1)));
    expect((await signedInUser(NOW))?.googleJustLinked).toBe(true);
    getUserCall.mockResolvedValueOnce(user(ago(60)));
    expect((await signedInUser(NOW))?.googleJustLinked).toBe(false);
  });

  it('has no Google names for an email account, and is null when signed out', async () => {
    getUserCall.mockResolvedValueOnce({
      data: { user: { identities: [{ provider: 'email' }], user_metadata: { given_name: 'X', full_name: 'X Y' } } },
    });
    expect(await signedInUser(NOW)).toEqual({
      email: null,
      givenName: null,
      familyName: null,
      fullName: null,
      googleJustLinked: false,
    });
    getUserCall.mockResolvedValueOnce({ data: { user: null } });
    expect(await signedInUser(NOW)).toBeNull();
  });
});
