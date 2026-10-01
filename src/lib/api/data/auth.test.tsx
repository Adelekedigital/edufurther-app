import { act, renderHook } from '@testing-library/react';

const order: string[] = [];
const signOut = vi.fn(async () => {
  order.push('signOut');
});
vi.mock('@/lib/vendor/supabase/browser', () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  signOut: () => signOut(),
}));
vi.mock('@/lib/utils/hardNavigate', () => ({
  hardNavigate: vi.fn((path: string) => order.push(`go ${path}`)),
}));
vi.mock('./session', () => ({ beginSignOut: () => order.push('freeze') }));

const { useSignOut } = await import('./auth');

describe('useSignOut (Logout)', () => {
  beforeEach(() => {
    order.length = 0;
  });

  it('freezes the screen, ends the session, then loads /login, in that order', async () => {
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current());
    // Frozen first: no signed-out redraw. Signed out before /login, which would
    // send a signed-in visitor straight back on.
    expect(order).toEqual(['freeze', 'signOut', 'go /login']);
  });

  it('signing out throws: /login loads anyway, so nobody is left on a half signed-out page', async () => {
    signOut.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current().catch(() => {}));
    expect(order).toEqual(['freeze', 'go /login']);
  });
});
