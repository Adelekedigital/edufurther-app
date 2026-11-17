import { previewStore, resetPreviewStoreForTests } from './previewStore';

/** The generated client, real, with fetch stubbed: the network boundary. */
const h = vi.hoisted(() => {
  // An absolute base: Node's Request can't parse a bare path.
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.test';
  return { fetch: vi.fn<(r: Request) => Promise<Response>>() };
});
vi.mock('@/lib/vendor/supabase/browser', () => ({
  getAccessToken: async () => 'tok',
  refreshAccessToken: async () => null,
  signOut: async () => {},
}));
vi.mock('@/lib/analytics/track', async (orig) => ({
  ...(await orig<typeof import('@/lib/analytics/track')>()),
  track: vi.fn(),
}));
vi.stubGlobal('fetch', (r: Request) => h.fetch(r));
const { track } = await import('@/lib/analytics/track');
const { profileShared, recordProfileShare, recordProfileVisit } = await import('./profileLinks');

/** Every request sent so far, once the client's middleware has run. */
async function settle() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}
const sent = () => h.fetch.mock.calls.map(([r]) => r);

afterAll(() => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

beforeEach(() => {
  sessionStorage.clear();
  resetPreviewStoreForTests();
  h.fetch.mockReset();
  h.fetch.mockResolvedValue(new Response(null, { status: 204 }));
});

describe('recordProfileVisit', () => {
  it('posts the visit with its channel and referrer, bearer token and keepalive', async () => {
    recordProfileVisit('ada-obi', { via: 'copy', referrerHost: 'l.instagram.com' });
    await settle();
    expect(sent()).toHaveLength(1);
    const r = sent()[0]!;
    expect(r.method).toBe('POST');
    expect(new URL(r.url).pathname).toBe('/api/v1/mentors/ada-obi/visits');
    expect(await r.json()).toEqual({ via: 'copy', referrer_host: 'l.instagram.com' });
    expect(r.headers.get('Authorization')).toBe('Bearer tok');
    expect(r.keepalive).toBe(true);
  });

  it('leaves out what it does not have: unknown or null fields would be refused', async () => {
    recordProfileVisit('ada-obi', { via: null, referrerHost: undefined });
    recordProfileVisit('ada-obi', { referrerHost: 'news.ycombinator.com' });
    recordProfileVisit('ada-obi');
    await settle();
    const bodies = await Promise.all(sent().map((r) => r.json()));
    expect(bodies).toEqual([{}, { referrer_host: 'news.ycombinator.com' }, {}]);
  });

  it('cuts anything longer than the server takes, rather than have it refused', async () => {
    recordProfileVisit('ada-obi', { via: 'x'.repeat(5000) });
    await settle();
    expect(((await sent()[0]!.json()) as { via: string }).via).toHaveLength(2048);
  });

  it('encodes the handle into the path', async () => {
    recordProfileVisit('a b/c');
    await settle();
    expect(new URL(sent()[0]!.url).pathname).toBe('/api/v1/mentors/a%20b%2Fc/visits');
  });
});

describe('recordProfileShare', () => {
  it('posts the method alone: own is the server’s to decide', async () => {
    recordProfileShare('ada-obi', 'native');
    await settle();
    const r = sent()[0]!;
    expect(new URL(r.url).pathname).toBe('/api/v1/mentors/ada-obi/shares');
    expect(await r.json()).toEqual({ method: 'native' });
    expect(r.keepalive).toBe(true);
  });
});

describe('profileShared: the one place a profile share is counted', () => {
  it('sends link_shared and posts the share, with the same method', async () => {
    vi.mocked(track).mockClear();
    profileShared('ada-obi', 'native', true);
    await settle();
    expect(track).toHaveBeenCalledExactlyOnceWith('link_shared', {
      kind: 'mentor_profile',
      method: 'native',
      own: true,
    });
    expect(sent()).toHaveLength(1);
    expect(new URL(sent()[0]!.url).pathname).toBe('/api/v1/mentors/ada-obi/shares');
    expect(await sent()[0]!.json()).toEqual({ method: 'native' });
  });
});

describe('fire and forget', () => {
  const unhandled = vi.fn();
  beforeAll(() => process.on('unhandledRejection', unhandled));
  afterAll(() => process.off('unhandledRejection', unhandled));
  beforeEach(() => unhandled.mockClear());

  it.each([
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    [
      'a 422',
      async () =>
        new Response(JSON.stringify({ type: '/problems/validation' }), {
          status: 422,
          headers: { 'content-type': 'application/problem+json' },
        }),
    ],
    ['a 500', async () => new Response('boom', { status: 500 })],
  ])('%s: never throws, never rejects, never retries', async (_name, answer) => {
    h.fetch.mockReset();
    h.fetch.mockImplementation(answer);
    expect(() => recordProfileVisit('ada-obi', { via: 'share' })).not.toThrow();
    expect(() => recordProfileShare('ada-obi', 'copy')).not.toThrow();
    await settle();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('a fetch that throws as it is called is ignored too', async () => {
    h.fetch.mockReset();
    h.fetch.mockImplementation(() => {
      throw new Error('no fetch');
    });
    expect(() => recordProfileVisit('ada-obi')).not.toThrow();
    await settle();
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('Preview as user', () => {
  it('sends nothing: the admin pressed nothing, and no Read only notice opens', async () => {
    previewStore.started(
      's-1',
      {
        id: 'u-1',
        email: 'amara.okafor@example.com',
        name: 'Amara Okafor',
        firstName: 'Amara',
        initials: 'AO',
        role: 'mentee',
      },
      { revealed: false, canReveal: false },
      '/admin/mentors',
    );
    recordProfileVisit('ada-obi', { via: 'copy' });
    recordProfileShare('ada-obi', 'copy');
    await settle();
    expect(h.fetch).not.toHaveBeenCalled();
    expect(previewStore.get().blocked).toBe(false);
  });
});
