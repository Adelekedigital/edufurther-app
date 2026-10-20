import { act, renderHook, waitFor } from '@testing-library/react';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';

const order: string[] = [];
const endSessionHere = vi.fn();
const signOut = vi.fn(async () => {
  order.push('signOut');
});
vi.mock('@/lib/vendor/supabase/browser', () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  signInWithGoogle: vi.fn(),
  signedInUser: vi.fn(),
  signOut: () => signOut(),
  endSessionHere: () => endSessionHere(),
}));
vi.mock('@/lib/utils/hardNavigate', () => ({
  hardNavigate: vi.fn((path: string) => order.push(`go ${path}`)),
}));
vi.mock('./session', () => ({ beginSignOut: () => order.push('freeze') }));
vi.mock('@/lib/utils/leaveGuard', () => ({ releaseLeaveGuards: () => order.push('release') }));

const { useSignOut, useSignOutHere, markAccountDeleted, takeAccountDeleted } =
  await import('./auth');

const withClient = (qc = new QueryClient()) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe('useSignOut (Logout)', () => {
  beforeEach(() => {
    order.length = 0;
  });
  const renderSignOut = (...a: Parameters<typeof useSignOut>) =>
    renderHook(() => useSignOut(...a), { wrapper: withClient() });

  it('freezes the screen, ends the session, then loads /login, in that order', async () => {
    const { result } = renderSignOut();
    await act(() => result.current());
    // Frozen first: no signed-out redraw. Signed out before /login, which would
    // send a signed-in visitor straight back on.
    expect(order).toEqual(['freeze', 'release', 'signOut', 'go /login']);
  });

  it('signing out throws: /login loads anyway, so nobody is left on a half signed-out page', async () => {
    signOut.mockRejectedValueOnce(new Error('network'));
    const { result } = renderSignOut();
    // Never rejects: the menu calls it as `void signOut()`.
    await act(() => result.current());
    expect(order).toEqual(['freeze', 'release', 'go /login']);
  });

  it('lands where the caller says (a deleted account’s notice)', async () => {
    const { result } = renderSignOut('/login?deleted=1');
    await act(() => result.current());
    expect(order).toEqual(['freeze', 'release', 'signOut', 'go /login?deleted=1']);
  });

  it('runs the caller’s last step right before the page leaves', async () => {
    const { result } = renderSignOut('/login?deleted=1', () => order.push('mark'));
    await act(() => result.current());
    expect(order.slice(-2)).toEqual(['mark', 'go /login?deleted=1']);
  });

  // Last in this block: it replaces the global focus listener, as Logout does.
  it('nothing refetches while it signs out: a focus between the delete and /login fetches no /me', async () => {
    // The earlier Logouts in this file froze the global managers: listen again, as the page does.
    focusManager.setEventListener((onFocus) => {
      const l = () => onFocus();
      window.addEventListener('visibilitychange', l);
      return () => window.removeEventListener('visibilitychange', l);
    });
    onlineManager.setEventListener((setOnline) => {
      const l = () => setOnline(true);
      window.addEventListener('online', l);
      return () => window.removeEventListener('online', l);
    });
    const qc = new QueryClient();
    const me = vi.fn(async () => ({ id: 'u1' }));
    const { result } = renderHook(
      () => {
        useQuery({ queryKey: ['viewer', 'me'], queryFn: me, refetchOnWindowFocus: 'always' });
        return useSignOut('/login?deleted=1');
      },
      { wrapper: withClient(qc) },
    );
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1));
    // The test can see a focus refetch: before signing out, one happens.
    act(() => void window.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(me).toHaveBeenCalledTimes(2));

    let finish: () => void = () => {};
    signOut.mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          finish = r;
        }),
    );
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current();
    });
    act(() => void window.dispatchEvent(new Event('visibilitychange')));
    act(() => void window.dispatchEvent(new Event('online')));
    await new Promise((r) => setTimeout(r, 20));
    finish();
    await act(() => done);
    expect(me).toHaveBeenCalledTimes(2);
    expect(order.at(-1)).toBe('go /login?deleted=1');
  });
});

describe('the deleted-account flag (one-shot, this tab)', () => {
  beforeEach(() => sessionStorage.clear());
  it('is true once after the delete path marks it, then false', () => {
    expect(takeAccountDeleted()).toBe(false);
    markAccountDeleted();
    expect(takeAccountDeleted()).toBe(true);
    expect(takeAccountDeleted()).toBe(false);
  });
});

describe('useSignOutHere (sign out, stay on the sign-in screen)', () => {
  function setup() {
    const qc = new QueryClient();
    qc.setQueryData(['viewer'], { id: 'u1' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSignOutHere(), { wrapper });
    return { qc, result };
  }
  beforeEach(() => {
    order.length = 0;
    endSessionHere.mockReset();
  });

  it('ends the session and clears the cache it keyed, without navigating', async () => {
    endSessionHere.mockResolvedValueOnce(true);
    const { qc, result } = setup();
    let ended: boolean | undefined;
    await act(async () => {
      ended = await result.current();
    });
    expect(ended).toBe(true);
    expect(qc.getQueryData(['viewer'])).toBeUndefined();
    expect(order).toEqual([]);
  });

  it('the session stayed: false, and the cache is left', async () => {
    endSessionHere.mockResolvedValueOnce(false);
    const { qc, result } = setup();
    let ended: boolean | undefined;
    await act(async () => {
      ended = await result.current();
    });
    expect(ended).toBe(false);
    expect(qc.getQueryData(['viewer'])).toEqual({ id: 'u1' });
  });

  it('it throws: false, never a rejection', async () => {
    endSessionHere.mockRejectedValueOnce(new Error('network'));
    const { result } = setup();
    let ended: boolean | undefined;
    await act(async () => {
      ended = await result.current();
    });
    expect(ended).toBe(false);
  });
});
