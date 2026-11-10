// The real client and its middleware order: request_failed must be registered
// before auth, so it sees the retry's answer, not the 401 it replaced.
const h = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://app.test';
  return { track: vi.fn(), fetch: vi.fn() };
});
vi.mock('@/lib/analytics/track', () => ({ track: h.track }));
vi.mock('@/lib/vendor/supabase/browser', () => ({
  getAccessToken: async () => 'old-token',
  refreshAccessToken: async () => 'new-token',
  signOut: vi.fn(),
}));
vi.mock('@/lib/utils/push', () => ({ dropDeviceSubscription: vi.fn() }));

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });

beforeAll(() => vi.stubGlobal('fetch', h.fetch));
afterAll(() => vi.unstubAllGlobals());

it('401, refresh, retry, 500: exactly one 5xx event', async () => {
  window.history.replaceState(null, '', '/sessions/s-123');
  h.fetch
    .mockResolvedValueOnce(json(401, { type: '/problems/unauthorized' }))
    .mockResolvedValueOnce(json(500, { type: '/problems/internal' }));
  const { api } = await import('./http');
  const { response } = await api.GET('/api/v1/me');
  expect(response.status).toBe(500);
  expect(h.fetch).toHaveBeenCalledTimes(2);
  expect(h.track.mock.calls).toEqual([
    ['request_failed', { route: '/sessions/[id]', status_bucket: '5xx', kind: 'internal' }],
  ]);
});
