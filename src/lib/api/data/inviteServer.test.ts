import { PROXY_SECRET, serverGet as get, stubServerEnv } from './_test/serverReadHarness';
import type * as InviteServer from './inviteServer';

vi.mock('openapi-fetch', async () => (await import('./_test/serverReadHarness')).openapiFetch);

const { lookupInviterOnServer }: typeof InviteServer = await import('./inviteServer');

beforeEach(stubServerEnv);
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
    expect(init.headers).toEqual({ 'x-edufurther-proxy-secret': PROXY_SECRET });
    expect(init.cache).toBe('no-store');
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
