/**
 * An expired or revoked session ends like a manual log-out for analytics:
 * resetIdentity() runs, so the next person on this device starts fresh
 * (PRD 30, shared devices).
 */
const h = vi.hoisted(() => {
  // An absolute base: Node's Request can't parse a bare path.
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.test';
  return {
    fetch: vi.fn<(r: Request) => Promise<Response>>(),
    refresh: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
    resetIdentity: vi.fn(),
  };
});
vi.mock('@/lib/vendor/supabase/browser', () => ({
  getAccessToken: async () => 'tok',
  refreshAccessToken: () => h.refresh(),
  signOut: () => h.signOut(),
}));
vi.mock('@/lib/analytics/identity', () => ({ resetIdentity: () => h.resetIdentity() }));
vi.mock('@/lib/utils/push', () => ({ dropDeviceSubscription: async () => {} }));
vi.stubGlobal('fetch', (r: Request) => h.fetch(r));
const { api } = await import('./http');

afterAll(() => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

it('a session that has ended resets analytics identity before signing out', async () => {
  h.fetch.mockResolvedValue(new Response('{}', { status: 401 }));
  await api.GET('/api/v1/me');
  await vi.waitFor(() => expect(h.signOut).toHaveBeenCalled());
  expect(h.resetIdentity).toHaveBeenCalledTimes(1);
});

export {};
