export {};

const signOutCall = vi.fn();
const oauthCall = vi.fn();
const stopAutoRefresh = vi.fn(async () => {});
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      signOut: (o: unknown) => signOutCall(o),
      stopAutoRefresh: () => stopAutoRefresh(),
      signInWithOAuth: (o: unknown) => oauthCall(o),
    },
  }),
}));
vi.mock('./config', () => ({
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'k',
  authConfigured: true,
}));

const { signOut, signInWithGoogle, SIGN_OUT_TIMEOUT_MS } = await import('./browser');

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

describe('signInWithGoogle', () => {
  const BACK = 'http://localhost:3000/auth/callback?next=%2Fexplore';

  it('asks Supabase for Google and carries the landing URL, so `next` survives', async () => {
    oauthCall.mockResolvedValue({ error: null });
    expect(await signInWithGoogle(BACK)).toEqual({ ok: true });
    expect(oauthCall).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: BACK },
    });
  });

  it('maps a refusal to a reason the screen can word (provider off → unknown)', async () => {
    oauthCall.mockResolvedValue({ error: { status: 400, message: 'provider is not enabled' } });
    expect(await signInWithGoogle(BACK)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('is rate limiting, not a generic failure, on a 429', async () => {
    oauthCall.mockResolvedValue({ error: { status: 429 } });
    expect(await signInWithGoogle(BACK)).toEqual({ ok: false, reason: 'rateLimited' });
  });
});
