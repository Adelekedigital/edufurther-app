import { previewStore, resetPreviewStoreForTests } from './previewStore';

/**
 * The generated client's middleware order (http.ts): preview first, so the
 * auth retry carries X-EF-Preview, and a 401 preview-ended is final.
 */
const h = vi.hoisted(() => {
  // An absolute base: Node's Request can't parse a bare path.
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.test';
  return {
    fetch: vi.fn<(r: Request) => Promise<Response>>(),
    refresh: vi.fn(async () => 'fresh'),
    signOut: vi.fn(async () => {}),
  };
});
vi.mock('@/lib/vendor/supabase/browser', () => ({
  getAccessToken: async () => 'tok',
  refreshAccessToken: () => h.refresh(),
  signOut: () => h.signOut(),
}));
vi.stubGlobal('fetch', (r: Request) => h.fetch(r));
const { api } = await import('./http');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterAll(() => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

beforeEach(() => {
  sessionStorage.clear();
  resetPreviewStoreForTests();
  h.fetch.mockReset();
  h.refresh.mockClear();
  h.signOut.mockClear();
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
});

describe('api (http.ts): Preview as user before auth', () => {
  it('a member call carries the bearer token and the preview header', async () => {
    h.fetch.mockResolvedValueOnce(json(200, {}));
    await api.GET('/api/v1/me');
    const sent = h.fetch.mock.calls[0]![0];
    expect(sent.headers.get('Authorization')).toBe('Bearer tok');
    expect(sent.headers.get('X-EF-Preview')).toBe('s-1');
  });

  it('the auth retry after a refresh still carries the preview header', async () => {
    h.fetch
      .mockResolvedValueOnce(json(401, { type: '/problems/unauthorized' }))
      .mockResolvedValueOnce(json(200, {}));
    await api.GET('/api/v1/me');
    expect(h.refresh).toHaveBeenCalledOnce();
    const retry = h.fetch.mock.calls[1]![0];
    expect(retry.headers.get('Authorization')).toBe('Bearer fresh');
    expect(retry.headers.get('X-EF-Preview')).toBe('s-1');
  });

  it('401 preview-ended: no refresh, no retry, no sign-out; the preview ends', async () => {
    h.fetch.mockResolvedValueOnce(
      json(401, { type: '/problems/preview-ended', end_reason: 'idle' }),
    );
    const { response } = await api.GET('/api/v1/me');
    expect(response.status).toBe(401);
    expect(h.fetch).toHaveBeenCalledOnce();
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.signOut).not.toHaveBeenCalled();
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: { name: 'Amara Okafor', reason: 'idle' },
    });
  });

  it('a write is never sent: no fetch, no refresh, the caller gets the read-only 403', async () => {
    const { error, response } = await api.POST('/api/v1/me/mentor-application/approved-seen');
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.refresh).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(error).toMatchObject({ type: '/problems/read-only-view-as' });
    expect(previewStore.get().blocked).toBe(true);
  });

  it('the admin’s own calls go without the header', async () => {
    h.fetch.mockResolvedValueOnce(json(200, { data: [], next_cursor: null }));
    await api.GET('/api/v1/admin/users', { params: { query: { role: 'all' } } });
    expect(h.fetch.mock.calls[0]![0].headers.has('X-EF-Preview')).toBe(false);
  });
});
