import { NextRequest } from 'next/server';
import { encodeLanding } from '@/lib/utils/landingHint';

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
  COOKIE_OPTIONS: { secure: false },
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

  it('/sessions/{id}/enter gets it too, to record the arrival; only that exact path', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    const enter = await proxy(new NextRequest('https://app.test/sessions/b1/enter'));
    expect(forwarded(enter, 'x-ef-access-token')).toBe('tok-fresh');
    for (const path of [
      '/sessions/b1',
      '/sessions/b1/enter/more',
      '/sessions/b1/entering',
      '/sessions/a/b/enter',
      '/x/sessions/b1/enter',
    ]) {
      const res = await proxy(new NextRequest(`https://app.test${path}`));
      expect(forwarded(res, 'x-ef-access-token'), path).toBeNull();
    }
  });

  it('strips a client-sent token header on every path, the entry route included', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    for (const path of ['/', '/explore', '/sessions/b1', '/sessions/b1/enter']) {
      const res = await proxy(
        new NextRequest(`https://app.test${path}`, {
          headers: { 'x-ef-access-token': 'someone-elses' },
        }),
      );
      expect(forwarded(res, 'x-ef-access-token'), path).toBeNull();
      // A signed-out members-only page (/sessions/b1) is a redirect to log in:
      // nothing is forwarded to a render at all.
      expect(res.headers.get('x-middleware-override-headers') ?? '', path).not.toContain(
        'x-ef-access-token',
      );
    }
  });

  it('a signed-in visitor’s own header is replaced by the verified token, never passed on', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    const res = await proxy(
      new NextRequest('https://app.test/sessions/b1/enter', {
        headers: { 'x-ef-access-token': 'someone-elses' },
      }),
    );
    expect(forwarded(res, 'x-ef-access-token')).toBe('tok-fresh');
  });
});

describe('proxy: a signed-out visitor on a members-only page goes to log in (owner, 2026-11-12)', () => {
  it('signed out on /bookings: to log in, and back to the page with its query after', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await proxy(new NextRequest('https://app.test/bookings?tab=past'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://app.test/login?next=%2Fbookings%3Ftab%3Dpast',
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('signed out on a public page (Explore, a mentor profile, an invite): no redirect', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    for (const path of ['/explore', '/mentors/ada-l', '/invite/damilola-7k2x', '/login']) {
      const res = await proxy(new NextRequest(`https://app.test${path}`));
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('an unknown path is not a page: the 404, never a login', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const res = await proxy(new NextRequest('https://app.test/no-such-page'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('a failed check: never sent away (a signed-in member isn’t logged out by a blip)', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('fetch failed') });
    const res = await proxy(new NextRequest('https://app.test/bookings'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('signed in: the page as usual', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null });
    const res = await proxy(new NextRequest('https://app.test/bookings'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy: the API goes to the backend with the origin-lock header (backend #426)', () => {
  const SECRET = 'f'.repeat(64);
  const rewrite = (res: Response) => res.headers.get('x-middleware-rewrite');
  beforeEach(() => {
    getClaims.mockReset();
    vi.stubEnv('BACKEND_URL', 'https://be.test');
    vi.stubEnv('EDGE_PROXY_SECRET', SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('forwards path and query to BACKEND_URL, adding the secret, without touching the session', async () => {
    const res = await proxy(
      new NextRequest('https://app.test/api/v1/mentors?offering=a&offering=b', {
        method: 'POST',
        headers: { authorization: 'Bearer tok' },
      }),
    );
    expect(rewrite(res)).toBe('https://be.test/api/v1/mentors?offering=a&offering=b');
    expect(forwarded(res, 'x-edufurther-proxy-secret')).toBe(SECRET);
    // The caller's own headers still reach the backend.
    expect(forwarded(res, 'authorization')).toBe('Bearer tok');
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('a value a client sent under that name is replaced by ours', async () => {
    const res = await proxy(
      new NextRequest('https://app.test/api/v1/me', {
        headers: { 'x-edufurther-proxy-secret': 'guess' },
      }),
    );
    expect(forwarded(res, 'x-edufurther-proxy-secret')).toBe(SECRET);
  });

  it('no secret set (local dev): no header, and a client’s value is still dropped', async () => {
    vi.stubEnv('EDGE_PROXY_SECRET', '');
    const res = await proxy(
      new NextRequest('https://app.test/api/v1/me', {
        headers: { 'x-edufurther-proxy-secret': 'guess' },
      }),
    );
    expect(rewrite(res)).toBe('https://be.test/api/v1/me');
    expect(forwarded(res, 'x-edufurther-proxy-secret')).toBeNull();
    expect(res.headers.get('x-middleware-override-headers')).not.toContain(
      'x-edufurther-proxy-secret',
    );
  });

  it('bare /api/v1 is forwarded too, as the old `:path*` rewrite did, without a session check', async () => {
    const res = await proxy(new NextRequest('https://app.test/api/v1?x=1'));
    expect(rewrite(res)).toBe('https://be.test/api/v1?x=1');
    expect(forwarded(res, 'x-edufurther-proxy-secret')).toBe(SECRET);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('no backend (local dev on the mock): not rewritten anywhere', async () => {
    vi.stubEnv('BACKEND_URL', '');
    const res = await proxy(new NextRequest('https://app.test/api/v1/me'));
    expect(rewrite(res)).toBeNull();
  });

  it('pages never get the secret, and the mock API is not forwarded', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    for (const path of ['/', '/explore', '/api/mock/api/v1/me', '/api/v1x']) {
      const res = await proxy(new NextRequest(`https://app.test${path}`));
      expect(rewrite(res), path).toBeNull();
      expect(forwarded(res, 'x-edufurther-proxy-secret'), path).toBeNull();
    }
  });
});

describe('proxy: a mentor landing on Explore goes home before any of it is drawn (owner, 2026-11-01)', () => {
  // Built as the route writes it (encodeLanding), URI-encoded as a cookie.
  const hint = (userId: string, home: string) =>
    `ef-landing=${encodeURIComponent(encodeLanding(userId, home))}`;
  // What the browser sends when the person opens the page themselves.
  const LANDING = {
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
  };
  const open = (path: string, headers: Record<string, string> = {}) =>
    proxy(new NextRequest(`https://app.test${path}`, { headers: { ...LANDING, ...headers } }));
  beforeEach(() => getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } }, error: null }));

  it('an app launch, bookmark or typed /explore with their own hint: their home, uncached, session kept fresh', async () => {
    const res = await open('/explore', { cookie: hint('u1', '/dashboard') });
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://app.test/dashboard');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('fresh');
  });

  it('moving to Explore inside the app: Explore, as chosen', async () => {
    const cookie = hint('u1', '/dashboard');
    const cases: Record<string, string>[] = [
      // Next's in-app navigation and prefetch: fetches, not documents.
      { 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin' },
      // A full load from one of our own pages (a new tab, a hard navigation).
      { 'sec-fetch-site': 'same-origin' },
      // A link from another site (a shared Explore link).
      { 'sec-fetch-site': 'cross-site' },
    ];
    for (const extra of cases) {
      const res = await open('/explore', { cookie, ...extra });
      expect(res.headers.get('location'), JSON.stringify(extra)).toBeNull();
    }
  });

  it('a mentor who already chose Explore this browser session: a reload or Back keeps it', async () => {
    const res = await open('/explore', {
      cookie: `${hint('u1', '/dashboard')}; ef-chose-explore=u1`,
    });
    expect(res.headers.get('location')).toBeNull();
  });

  it('another account’s “chose Explore” (a shared device, signed out and in): still redirected', async () => {
    for (const marker of ['u2', '1', '']) {
      const res = await open('/explore', {
        cookie: `${hint('u1', '/dashboard')}; ef-chose-explore=${marker}`,
      });
      expect(res.headers.get('location'), marker).toBe('https://app.test/dashboard');
    }
  });

  it('a browser that sends no fetch metadata: never redirected', async () => {
    const res = await proxy(
      new NextRequest('https://app.test/explore', {
        headers: { cookie: hint('u1', '/dashboard') },
      }),
    );
    expect(res.headers.get('location')).toBeNull();
  });

  it('no hint (a mentee, a first visit), another account’s, or no verified session: Explore', async () => {
    expect((await open('/explore')).headers.get('location')).toBeNull();
    const other = await open('/explore', { cookie: hint('u2', '/dashboard') });
    expect(other.headers.get('location')).toBeNull();
    getClaims.mockResolvedValue({ data: null, error: null });
    const guest = await open('/explore', { cookie: hint('u1', '/dashboard') });
    expect(guest.headers.get('location')).toBeNull();
    getClaims.mockResolvedValue({ data: null, error: new Error('fetch failed') });
    const unknown = await open('/explore', { cookie: hint('u1', '/dashboard') });
    expect(unknown.headers.get('location')).toBeNull();
  });

  it('only Explore, and only toward a mentor home', async () => {
    for (const path of ['/bookings', '/mentors/ada', '/explore/x']) {
      const res = await open(path, { cookie: hint('u1', '/dashboard') });
      expect(res.headers.get('location'), path).toBeNull();
    }
    const evil = await open('/explore', { cookie: hint('u1', '//evil.test') });
    expect(evil.headers.get('location')).toBeNull();
  });
});

describe('proxy: /ingest goes to PostHog without this site’s cookies (PRD 30)', () => {
  const secretHeaders = {
    cookie: 'sb-x-auth-token=secret; ef_consent=v.1.1',
    authorization: 'Bearer tok',
    referer: 'https://app.test/invite/abc?viewAs=a@b.c',
    'x-edufurther-proxy-secret': 'nope',
    'content-type': 'text/plain',
  };
  const send = (path: string) =>
    proxy(new NextRequest(`https://app.test${path}`, { method: 'POST', headers: secretHeaders }));

  beforeEach(() => {
    vi.stubEnv('POSTHOG_HOST', 'https://eu.i.posthog.com');
    getClaims.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['/ingest/e/?ip=1', 'https://eu.i.posthog.com/e/?ip=1'],
    ['/INGEST/e/', 'https://eu.i.posthog.com/e/'],
    ['/Ingest/flags/?v=2', 'https://eu.i.posthog.com/flags/?v=2'],
    ['/ingest/static/a.js', 'https://eu-assets.i.posthog.com/static/a.js'],
    ['/Ingest/static/a.js', 'https://eu-assets.i.posthog.com/static/a.js'],
  ])('%s goes to %s with no cookie, credentials, referer or secret', async (path, to) => {
    const res = await send(path);
    expect(res.headers.get('x-middleware-rewrite')).toBe(to);
    const overridden = (res.headers.get('x-middleware-override-headers') ?? '').split(',');
    for (const h of ['cookie', 'authorization', 'referer', 'x-edufurther-proxy-secret'])
      expect(overridden, h).not.toContain(h);
    expect(forwarded(res, 'cookie')).toBeNull();
    expect(forwarded(res, 'referer')).toBeNull();
    expect(forwarded(res, 'content-type')).toBe('text/plain');
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('a path that only starts with the word is a page, not PostHog', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const res = await proxy(new NextRequest('https://app.test/ingestion'));
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('no POSTHOG_HOST: 404, nothing forwarded', async () => {
    vi.stubEnv('POSTHOG_HOST', '');
    const res = await send('/ingest/e/');
    expect(res.status).toBe(404);
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });
});

describe('proxy: the trailing-slash redirect Next no longer makes (skipTrailingSlashRedirect)', () => {
  it.each([
    ['/explore/', 'https://app.test/explore'],
    ['/sessions/b1/enter/?x=1', 'https://app.test/sessions/b1/enter?x=1'],
    ['/api/v1/me/', 'https://app.test/api/v1/me'],
  ])('%s → 308 %s', async (path, to) => {
    const res = await proxy(new NextRequest(`https://app.test${path}`));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(to);
  });

  it('/ stays', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const res = await proxy(new NextRequest('https://app.test/'));
    expect(res.status).not.toBe(308);
  });
});
