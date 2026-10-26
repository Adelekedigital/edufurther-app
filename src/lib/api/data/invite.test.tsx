import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toInviteLink, useInviteLink, useReferrals } from './invite';

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
