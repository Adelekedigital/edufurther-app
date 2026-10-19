import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const { useSignOut, useSignOutHere } = await import('./auth');

describe('useSignOut (Logout)', () => {
  beforeEach(() => {
    order.length = 0;
  });

  it('freezes the screen, ends the session, then loads /login, in that order', async () => {
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current());
    // Frozen first: no signed-out redraw. Signed out before /login, which would
    // send a signed-in visitor straight back on.
    expect(order).toEqual(['freeze', 'release', 'signOut', 'go /login']);
  });

  it('signing out throws: /login loads anyway, so nobody is left on a half signed-out page', async () => {
    signOut.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useSignOut());
    // Never rejects: the menu calls it as `void signOut()`.
    await act(() => result.current());
    expect(order).toEqual(['freeze', 'release', 'go /login']);
  });

  it('lands where the caller says (a deleted account’s notice)', async () => {
    const { result } = renderHook(() => useSignOut('/login?deleted=1'));
    await act(() => result.current());
    expect(order).toEqual(['freeze', 'release', 'signOut', 'go /login?deleted=1']);
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
