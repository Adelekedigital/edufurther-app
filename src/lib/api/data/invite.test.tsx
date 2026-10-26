import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  claimInvite,
  toInviteLink,
  CLAIM_TIMEOUT_MS,
  inviterPhoto,
  toInviter,
  useInviteLink,
  useInviteLookup,
  useReferrals,
} from './invite';

const get = vi.fn();
const post = vi.fn();
vi.mock('./http', () => ({
  api: {
    GET: (...a: unknown[]) => get(...a),
    POST: (...a: unknown[]) => post(...a),
  },
}));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'present', userId: 'me' }),
  sessionKey: () => 'me',
}));

const resp = (status: number, data: unknown) => ({
  data,
  error: status >= 400 ? {} : undefined,
  response: { ok: status < 400, status, headers: new Headers() },
});

const referral = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  code: 'friend-a1b2',
  invitee_email: null,
  invited_at: '2026-10-20T10:00:00Z',
  signed_up_at: null,
  qualified_at: null,
  ...over,
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
});

describe('toInviteLink', () => {
  it('composes /invite/{code} on the given origin', () => {
    expect(toInviteLink({ code: 'damilola-7k2x', active: true }, 'https://app.test')).toEqual({
      code: 'damilola-7k2x',
      active: true,
      url: 'https://app.test/invite/damilola-7k2x',
    });
  });

  it('encodes a code that is not URL-safe', () => {
    expect(toInviteLink({ code: 'a b', active: true }, 'https://app.test').url).toBe(
      'https://app.test/invite/a%20b',
    );
  });
});

describe('useInviteLink', () => {
  it('creates or reads the link once and builds the URL on this origin', async () => {
    post.mockResolvedValue(resp(201, { code: 'damilola-7k2x', active: true }));
    const { result } = renderHook(() => useInviteLink('me'), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(post).toHaveBeenCalledWith('/api/v1/me/invite-link', expect.anything());
    expect(result.current.data?.url).toBe(`${window.location.origin}/invite/damilola-7k2x`);
    expect(result.current.error).toBeNull();
  });

  it('a failure is an error with a retry, not a link', async () => {
    post.mockResolvedValueOnce(resp(500, null));
    const { result } = renderHook(() => useInviteLink('me'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    post.mockResolvedValueOnce(resp(200, { code: 'damilola-7k2x', active: true }));
    result.current.retry();
    await waitFor(() => expect(result.current.data?.code).toBe('damilola-7k2x'));
  });

  it('asks nothing for a guest', () => {
    const { result } = renderHook(() => useInviteLink(null), { wrapper });
    expect(post).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('asks once: no second POST on window focus', async () => {
    post.mockResolvedValue(resp(200, { code: 'damilola-7k2x', active: true }));
    const { result } = renderHook(() => useInviteLink('me'), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    window.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while inactive', () => {
    const { result } = renderHook(() => useInviteLink('me', false), { wrapper });
    expect(post).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useReferrals', () => {
  it('a friend who finished their profile means friendJoined', async () => {
    get.mockResolvedValue(
      resp(200, [
        referral({ signed_up_at: '2026-10-21T10:00:00Z' }),
        referral({ id: 'r2', qualified_at: '2026-10-22T10:00:00Z' }),
      ]),
    );
    const { result } = renderHook(() => useReferrals('me'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(get).toHaveBeenCalledWith('/api/v1/me/referrals', expect.anything());
    expect(result.current.friendJoined).toBe(true);
  });

  it('signed up but not finished is not joined', async () => {
    get.mockResolvedValue(resp(200, [referral({ signed_up_at: '2026-10-21T10:00:00Z' })]));
    const { result } = renderHook(() => useReferrals('me'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.friendJoined).toBe(false);
  });

  it('asks nothing for a guest', () => {
    renderHook(() => useReferrals(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });

  it('a failed read is an error, and never a joined friend', async () => {
    get.mockResolvedValue(resp(500, null));
    const { result } = renderHook(() => useReferrals('me'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.friendJoined).toBe(false);
  });
});

describe('useInviteLookup', () => {
  it('names the inviter of a code it is given', async () => {
    get.mockResolvedValue(
      resp(200, {
        inviter: { first_name: ' Damilola ', avatar_url: 'https://x.supabase.co/p.jpg' },
      }),
    );
    const { result } = renderHook(() => useInviteLookup('damilola-7k2x'), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual({
        firstName: 'Damilola',
        photoUrl: 'https://x.supabase.co/p.jpg',
      }),
    );
    expect(get).toHaveBeenCalledWith('/api/v1/invites/{code}', {
      params: { path: { code: 'damilola-7k2x' } },
      signal: expect.anything(),
    });
  });

  it('has no inviter for an unknown, retired or revoked code, or one with no first name', () => {
    expect(toInviter({ inviter: null })).toBeNull();
    expect(toInviter({ inviter: { first_name: null, avatar_url: null } })).toBeNull();
    expect(toInviter({ inviter: { first_name: '  ', avatar_url: null } })).toBeNull();
  });

  it('never asks about a code that fails the backend’s test, or no code', () => {
    renderHook(() => useInviteLookup('<b>hi</b>'), { wrapper });
    renderHook(() => useInviteLookup(null), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });

  it('only loads a photo from our image host', () => {
    const ours = 'https://abc.supabase.co/storage/v1/object/public/avatars/p.jpg';
    expect(inviterPhoto(ours)).toBe(ours);
    expect(inviterPhoto('https://tracker.example/p.gif')).toBeNull();
    expect(inviterPhoto('http://abc.supabase.co/p.jpg')).toBeNull();
    expect(inviterPhoto('https://supabase.co.evil.test/p.jpg')).toBeNull();
    expect(inviterPhoto('javascript:alert(1)')).toBeNull();
    expect(inviterPhoto('not a url')).toBeNull();
    expect(inviterPhoto(null)).toBeNull();
  });

  it('answers no inviter when rate-limited (429), without retrying', async () => {
    get.mockResolvedValue(resp(429, undefined));
    const { result } = renderHook(() => useInviteLookup('damilola-7k2x'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('answers no inviter on a failure', async () => {
    get.mockResolvedValue(resp(404, undefined));
    const { result } = renderHook(() => useInviteLookup('gone-1234'), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
});

describe('claimInvite', () => {
  it('posts the code (ReferralClaim) and reads the referral lists again', async () => {
    post.mockResolvedValue(resp(200, { id: 'r9', code: 'x', invited_at: 'now' }));
    const spy = vi.spyOn(client, 'invalidateQueries');
    await claimInvite(client, 'damilola-7k2x');
    expect(post).toHaveBeenCalledWith('/api/v1/me/referrals/claim', {
      body: { code: 'damilola-7k2x' },
      signal: expect.anything(),
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['invite', 'referrals'] });
  });

  it.each([404, 409, 422, 500])(
    'rejects on a %i, and still refreshes the lists',
    async (status) => {
      post.mockResolvedValue(resp(status, undefined));
      const spy = vi.spyOn(client, 'invalidateQueries');
      await expect(claimInvite(client, 'damilola-7k2x')).rejects.toBeTruthy();
      expect(spy).toHaveBeenCalled();
    },
  );

  it('gives up after CLAIM_TIMEOUT_MS, so a hung claim never holds up the sign-up', async () => {
    vi.useFakeTimers();
    try {
      post.mockImplementation(
        (_path: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener('abort', () => reject(new Error('aborted'))),
          ),
      );
      const spy = vi.spyOn(client, 'invalidateQueries');
      const settled = expect(claimInvite(client, 'damilola-7k2x')).rejects.toBeTruthy();
      await vi.advanceTimersByTimeAsync(CLAIM_TIMEOUT_MS);
      await settled;
      expect(spy).toHaveBeenCalledWith({ queryKey: ['invite', 'referrals'] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('never sends a code that fails the backend’s test', async () => {
    await expect(claimInvite(client, 'a/b')).rejects.toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});
