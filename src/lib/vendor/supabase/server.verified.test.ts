// @vitest-environment node
export {};
const getClaims = vi.fn();
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getClaims } }) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock('./config', () => ({
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'k',
  authConfigured: true,
  COOKIE_OPTIONS: { secure: false },
}));

const { verifiedUserId } = await import('./server');

describe('verifiedUserId: the Supabase user a route handler may trust', () => {
  it('the verified JWT `sub`, the same id the proxy compares (landing hint)', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'sub-1' } }, error: null });
    expect(await verifiedUserId()).toBe('sub-1');
  });

  it('signed out, a failed check, or no usable sub: null', async () => {
    for (const r of [
      { data: null, error: null },
      { data: null, error: new Error('fetch failed') },
      { data: { claims: { sub: '' } }, error: null },
      { data: { claims: {} }, error: null },
    ]) {
      getClaims.mockResolvedValue(r);
      expect(await verifiedUserId(), JSON.stringify(r)).toBeNull();
    }
  });
});
