import type * as InviteServer from './inviteServer';
const get = vi.fn();
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: (...a: unknown[]) => get(...a) }) }));

const { lookupInviterOnServer }: typeof InviteServer = await import('./inviteServer');

beforeEach(() => {
  get.mockReset();
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  vi.stubEnv('BACKEND_URL', 'https://api.example.test');
  vi.stubEnv('EDGE_PROXY_SECRET', 'x'.repeat(40));
});
afterEach(() => vi.unstubAllEnvs());

describe('lookupInviterOnServer', () => {
  it('names the inviter, sending the origin-lock header and no token', async () => {
    get.mockResolvedValue({
      data: { inviter: { first_name: 'Damilola', avatar_url: 'https://evil.test/a.png' } },
    });
    expect(await lookupInviterOnServer('damilola-7k2x', 'https://app.test')).toEqual({
      firstName: 'Damilola',
      photoUrl: null,
    });
    const init = get.mock.calls[0]![1];
    expect(init.params).toEqual({ path: { code: 'damilola-7k2x' } });
    expect(init.headers).toEqual({ 'x-edufurther-proxy-secret': 'x'.repeat(40) });
  });

  it('null for a code that can’t be joined, a failure, or a code that fails the test', async () => {
    get.mockResolvedValueOnce({ data: { inviter: null } });
    expect(await lookupInviterOnServer('gone-0000', 'https://app.test')).toBeNull();
    get.mockRejectedValueOnce(new Error('timeout'));
    expect(await lookupInviterOnServer('damilola-7k2x', 'https://app.test')).toBeNull();
    expect(await lookupInviterOnServer('a/b', 'https://app.test')).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('asks the in-app mock, without the secret, while a mock viewer is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'guest');
    get.mockResolvedValue({ data: { inviter: null } });
    await lookupInviterOnServer('damilola-7k2x', 'http://localhost:3000');
    expect(get.mock.calls[0]![1].headers).toEqual({});
  });
});
